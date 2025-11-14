const express = require('express');
const axios = require('axios');

// Import your existing services
const documentRepository = require('./repositories/documentRepository');
const { parseFile, chunkText } = require('./services/fileparsingService');
const { storeChunksWithEmbeddings } = require('./services/embeddingService');
const { detectLanguage } = require('./services/languageService');

const app = express();
app.use(express.json());

// Auth middleware
const authenticateWorker = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.WORKER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Webhook endpoint (triggered by Vercel)
app.post('/process-document', authenticateWorker, async (req, res) => {
  const { documentId, cloudinaryUrl, mimeType, fileType } = req.body;

  console.log(`📥 Received processing request for document ${documentId}`);

  // Respond immediately
  res.json({
    status: 'processing started',
    documentId,
    message: 'Worker is processing your document'
  });

  // Process in background (no timeout!)
  processDocument(documentId, cloudinaryUrl, mimeType, fileType)
    .catch(err => console.error('Background processing error:', err));
});

// Polling endpoint (backup method)
app.post('/poll-pending', authenticateWorker, async (req, res) => {
  try {
    console.log('🔍 Polling for pending documents...');

    const pendingDocs = await documentRepository.getPendingDocuments();

    if (pendingDocs.length === 0) {
      return res.json({ message: 'No pending documents', count: 0 });
    }

    console.log(`Found ${pendingDocs.length} pending documents`);

    res.json({
      status: 'processing started',
      count: pendingDocs.length,
      documentIds: pendingDocs.map(d => d.id)
    });

    // Process each document
    for (const doc of pendingDocs) {
      processDocument(doc.id, doc.file_path, doc.mime_type, doc.file_type)
        .catch(err => console.error(`Error processing ${doc.id}:`, err));
    }
  } catch (error) {
    console.error('Polling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main processing function (your existing logic)
const processDocument = async (documentId, cloudinaryUrl, mimeType, fileType) => {
  try {
    console.log(`🚀 Starting processing for document ${documentId}`);
    console.log(`📄 File: ${fileType}, MIME: ${mimeType}`);

    // Update status
    await documentRepository.updateProcessingStatus(documentId, 'processing');

    // Download file from Cloudinary
    console.log('⬇️ Downloading file from Cloudinary...');
    const response = await axios.get(cloudinaryUrl, {
      responseType: 'arraybuffer',
      timeout: 60000 // 60 second timeout for download
    });
    const buffer = Buffer.from(response.data);
    console.log(`✅ Downloaded ${buffer.length} bytes`);

    // Parse file
    console.log('📖 Parsing file...');
    const { text, pages, totalPages } = await parseFile(buffer, mimeType, fileType);

    if (!pages || pages.length === 0) {
      throw new Error('No pages extracted from document');
    }

    console.log(`✅ File parsed: ${totalPages} pages, ${text.length} characters`);

    // Detect language
    const language = detectLanguage(text);
    console.log('🌍 Detected language:', language);

    // Create chunks
    console.log('✂️ Creating chunks...');
    const allChunks = [];

    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) {
        console.warn(`⚠️ Skipping empty page ${page.pageNumber}`);
        continue;
      }

      const pageChunks = chunkText(page.text, 800, 100);

      pageChunks.forEach(chunkText => {
        allChunks.push({
          text: chunkText,
          pageNumber: page.pageNumber,
          language: language
        });
      });
    }

    if (allChunks.length === 0) {
      throw new Error('No valid chunks created from document');
    }

    console.log(`✅ Created ${allChunks.length} chunks`);

    // Store chunks with embeddings (NO TIMEOUT!)
    console.log('🔮 Generating embeddings and storing chunks...');
    console.log(`⏱️ This may take several minutes for ${allChunks.length} chunks...`);

    const chunkCount = await storeChunksWithEmbeddings(documentId, allChunks);

    if (chunkCount === 0) {
      throw new Error('Failed to store any chunks');
    }

    // Update document status
    await documentRepository.updateDocument(documentId, {
      processing_status: 'completed',
      total_pages: totalPages,
      processed_at: new Date().toISOString()
    });

    console.log(`✅✅ Document ${documentId} processed successfully!`);
    console.log(`📊 Final stats: ${chunkCount} chunks stored from ${totalPages} pages`);

  } catch (error) {
    console.error(`❌❌ Processing failed for document ${documentId}:`);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);

    // Update status to failed
    await documentRepository.updateProcessingStatus(
      documentId,
      'failed',
      error.message
    );
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Document Processing Worker',
    status: 'running',
    endpoints: {
      webhook: 'POST /process-document',
      polling: 'POST /poll-pending',
      health: 'GET /health'
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Worker server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});