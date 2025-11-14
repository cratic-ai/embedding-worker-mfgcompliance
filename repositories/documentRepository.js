const { supabase } = require('../config/supabase');

/**
 * Create a new document record
 * @param {object} documentData - Document data
 * @returns {Promise<object>} - Created document
 */

exports.createDocument = async (documentData) => {
  try {
    console.log("📤 Inserting document to Supabase:", documentData);

    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      console.error('Create document error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in createDocument:', error);
    throw error;
  }
};
// repositories/documentRepository.js

exports.getPendingDocuments = async () => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('processing_status', 'queued')
    .order('uploaded_at', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data || [];
};
/**
 * Get all documents for a user
 * @param {string} userId - User UUID
 * @returns {Promise<array>} - Array of documents
 */
exports.getAllDocuments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or(`user_id.eq.${userId},is_seeded.eq.true`)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Get documents error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllDocuments:', error.message);
    throw error;
  }
};

/**
 * Get document by ID
 * @param {string} documentId - Document UUID
 * @param {string} userId - User UUID (for permission check)
 * @returns {Promise<object>} - Document or null
 */
exports.getDocumentById = async (documentId, userId) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .or(`user_id.eq.${userId},is_seeded.eq.true`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Get document error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getDocumentById:', error.message);
    throw error;
  }
};

/**
 * Update document
 * @param {string} documentId - Document UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated document
 */
exports.updateDocument = async (documentId, updates) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Update document error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateDocument:', error.message);
    throw error;
  }
};

/**
 * Delete document
 * @param {string} documentId - Document UUID
 * @param {string} userId - User UUID (for permission check)
 * @returns {Promise<boolean>} - Success
 */
exports.deleteDocument = async (documentId, userId) => {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete document error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteDocument:', error.message);
    throw error;
  }
};

/**
 * Find documents by IDs (for batch operations)
 * @param {array} documentIds - Array of document UUIDs
 * @param {string} userId - User UUID
 * @returns {Promise<array>} - Array of documents
 */
exports.findDocumentsByIds = async (documentIds, userId) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .or(`user_id.eq.${userId},is_seeded.eq.true`);

    if (error) {
      console.error('Find documents error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in findDocumentsByIds:', error.message);
    throw error;
  }
};

/**
 * Update processing status
 * @param {string} documentId - Document UUID
 * @param {string} status - Status: 'pending', 'processing', 'completed', 'failed'
 * @param {string} error - Error message (if failed)
 * @returns {Promise<object>} - Updated document
 */
exports.updateProcessingStatus = async (documentId, status, error = null) => {
  try {
    const updates = {
      processing_status: status,
      processing_error: error
    };

    if (status === 'completed') {
      updates.processed_at = new Date().toISOString();
    }

    return await exports.updateDocument(documentId, updates);
  } catch (error) {
    console.error('Error updating processing status:', error.message);
    throw error;
  }
};

/**
 * Get documents with chunk statistics
 * @param {string} userId - User UUID
 * @returns {Promise<array>} - Documents with chunk counts
 */
exports.getDocumentsWithStats = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('documents_with_stats')
      .select('*')
      .or(`user_id.eq.${userId},is_seeded.eq.true`)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Get documents with stats error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDocumentsWithStats:', error.message);
    throw error;
  }
};