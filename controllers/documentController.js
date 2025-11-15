const cloudinary = require('../config/cloudinary');
const documentRepository = require('../repositories/documentRepository');
const { parseFile, chunkText } = require('../services/fileparsingService');
const { storeChunksWithEmbeddings } = require('../services/embeddingService');
const { detectLanguage } = require('../services/languageService');
const { getFileExtension } = require('../middlewares/upload');

/**
 * Upload and process document
 */

exports.uploadDocument = async (req, res) => {
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const userId = req.user.id;

    console.log(`Processing upload: ${originalname} (${mimetype})`);

    const fileType = getFileExtension(mimetype).replace('.', '');

    // ✅ Upload to Cloudinary with PUBLIC access
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'manufacturing-compliance',
          resource_type: 'auto',
          public_id: `${Date.now()}-${originalname.replace(/\.[^/.]+$/, '')}`,
          access_mode: 'public', // ✅ ADD THIS - makes file publicly accessible
          type: 'upload' // ✅ ADD THIS - not 'authenticated'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    console.log('File uploaded to Cloudinary:', uploadResult.secure_url);

    // Create document record
    const document = await documentRepository.createDocument({
      user_id: userId,
      title: originalname.replace(/\.[^/.]+$/, ''),
      filename: originalname,
      file_type: fileType,
      file_path: uploadResult.secure_url,
      cloudinary_id: uploadResult.public_id,
      mime_type: mimetype,
      file_size: size,
       processing_status: 'pending'
    });

    console.log('Document queued:', document.id);

    // Trigger Render worker
    triggerWorker(document.id, uploadResult.secure_url, mimetype, fileType);

    res.status(201).json({
      document: {
        id: document.id,
        title: document.title,
        fileType: document.file_type,
        processingStatus: 'pending',
        uploadedAt: document.uploaded_at
      },
      message: 'Document uploaded successfully. Processing queued.'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to trigger worker
const triggerWorker = async (documentId, cloudinaryUrl, mimeType, fileType) => {
  try {
    if (!process.env.RENDER_WORKER_URL) {
      console.warn('⚠️ RENDER_WORKER_URL not set. Worker trigger skipped.');
      return;
    }

    await fetch(`${process.env.RENDER_WORKER_URL}/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_SECRET}`
      },
      body: JSON.stringify({
        documentId,
        cloudinaryUrl,
        mimeType,
        fileType
      })
    });

    console.log(`✅ Worker triggered for document ${documentId}`);
  } catch (error) {
    console.error('Failed to trigger worker:', error.message);
    // Worker can pick it up via polling
  }
};
/**
 * Process document asynchronously (background job)
 */





/**
 * Get all documents for current user
 */
exports.getAllDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await documentRepository.getAllDocuments(userId);

    // Format response
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      processingStatus: doc.processing_status,
      processingError: doc.processing_error,
      totalPages: doc.total_pages,
      uploadedAt: doc.uploaded_at,
      processedAt: doc.processed_at,
      isSeeded: doc.is_seeded
    }));

    res.json({ documents: formattedDocs });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get document by ID
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      document: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        fileType: document.file_type,
        filePath: document.file_path,
        fileSize: document.file_size,
        processingStatus: document.processing_status,
        processingError: document.processing_error,
        totalPages: document.total_pages,
        uploadedAt: document.uploaded_at,
        processedAt: document.processed_at,
        isSeeded: document.is_seeded
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get document
    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Cloudinary if exists
    if (document.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(document.cloudinary_id);
        console.log('Deleted from Cloudinary:', document.cloudinary_id);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError.message);
        // Continue even if Cloudinary deletion fails
      }
    }

    // Delete from database (CASCADE will delete chunks and chat history)
    await documentRepository.deleteDocument(id, userId);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Serve document file (redirect to Cloudinary URL)
 */
exports.serveDocumentFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Redirect to Cloudinary URL
    res.redirect(document.file_path);

  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get processing status
 */
exports.getProcessingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const document = await documentRepository.getDocumentById(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      documentId: document.id,
      status: document.processing_status,
      error: document.processing_error,
      totalPages: document.total_pages,
      processedAt: document.processed_at
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: error.message });
  }
};
