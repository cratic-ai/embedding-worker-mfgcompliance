const azureOpenAI = require('../config/azureOpenai');
const { supabase } = require('../config/supabase');

/**
 * Generate embedding using Azure OpenAI text-embedding-3-small
 * @param {string} text - Text to embed
 * @returns {Promise<array>} - Embedding vector (1536 dimensions for text-embedding-3-small)
 */


/**
 * Generate embedding using Azure OpenAI text-embedding-3-small
 * @param {string} text - Text to embed
 * @returns {Promise<array>} - Embedding vector (1536 dimensions)
 */
const generateEmbedding = async (text, retries = 3) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Truncate if too long
    const maxLength = 8000;
    const truncatedText = text.length > maxLength
      ? text.substring(0, maxLength)
      : text.trim();

    console.log(`🔮 Generating embedding for text (${truncatedText.length} chars)...`);

    // ✅ FIX: Use embeddings.create() instead of getEmbeddings()
    // Create a separate client for embeddings
    const OpenAI = require('openai');
    const embeddingClient = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME}`,
      defaultHeaders: {
        "api-key": process.env.AZURE_OPENAI_API_KEY,
      },
      defaultQuery: {
        "api-version": "2025-01-01-preview",
      },
    });

    const response = await embeddingClient.embeddings.create({
      input: [truncatedText],
      model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME
    });

    if (!response || !response.data || !response.data[0] || !response.data[0].embedding) {
      console.error('Invalid response:', response);
      throw new Error('Invalid embedding response from Azure');
    }

    const embedding = response.data[0].embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`Invalid embedding: expected array, got ${typeof embedding}`);
    }

    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
    return embedding;

  } catch (error) {
    // Handle rate limiting
    if ((error.status === 429 || error.code === 'rate_limit_exceeded') && retries > 0) {
      const delay = (4 - retries) * 2000;
      console.log(`⚠️ Rate limited, waiting ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateEmbedding(text, retries - 1);
    }

    console.error('❌ Azure OpenAI embedding error:', error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Store document chunks with embeddings
 * @param {string} documentId - Document UUID
 * @param {array} chunks - Array of {text, pageNumber, language}
 * @returns {Promise<number>} - Number of chunks stored
 */




const storeChunksWithEmbeddings = async (documentId, chunks) => {
  try {
    console.log(`📦 Storing ${chunks.length} chunks for document ${documentId}...`);

    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks to process');
    }

    const chunksWithEmbeddings = [];
    let processedCount = 0;

    // Process in smaller batches to avoid rate limits
    const batchSize = 5; // Reduced from 10
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      const batchPromises = batch.map(async (chunk, batchIndex) => {
        try {
          // Validate chunk text
          if (!chunk.text || chunk.text.trim().length === 0) {
            console.warn(`⚠️ Skipping empty chunk at index ${i + batchIndex}`);
            return null;
          }

          // Generate embedding
          const embedding = await generateEmbedding(chunk.text);

          // Validate embedding
          if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
            console.error(`❌ Invalid embedding generated for chunk ${i + batchIndex}`);
            return null;
          }

          processedCount++;
          if (processedCount % 5 === 0) {
            console.log(`✅ Processed ${processedCount}/${chunks.length} embeddings`);
          }

          // ✅ IMPORTANT: Store as array, not JSON string for pgvector
          return {
            document_id: documentId,
            text: chunk.text.substring(0, 5000), // Limit text length
            page_number: chunk.pageNumber,
            chunk_index: i + batchIndex,
            embedding: embedding, // Store as array directly
            language: chunk.language || 'en'
          };
        } catch (error) {
          console.error(`❌ Error generating embedding for chunk ${i + batchIndex}:`, error.message);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(r => r !== null);

      if (validResults.length > 0) {
        chunksWithEmbeddings.push(...validResults);
      }

      // Longer delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (chunksWithEmbeddings.length === 0) {
      throw new Error('❌ Failed to generate any valid embeddings');
    }

    console.log(`💾 Inserting ${chunksWithEmbeddings.length} chunks into database...`);

    // Insert chunks into Supabase
    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunksWithEmbeddings);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${chunksWithEmbeddings.length} chunks with embeddings`);
    return chunksWithEmbeddings.length;

  } catch (error) {
    console.error('❌ Error storing chunks:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

/**
 * Search for similar chunks using vector similarity (pgvector)
 * @param {string} query - Search query
 * @param {array} documentIds - Array of document UUIDs to search within
 * @param {number} topK - Number of top results to return
 * @returns {Promise<array>} - Array of similar chunks with similarity scores
 */

const searchSimilarChunks = async (query, documentIds, topK = 5) => {
  try {
    console.log(`🔍 Searching for similar chunks in ${documentIds.length} documents...`);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // ✅ Pass embedding as array, not stringified
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: queryEmbedding, // Pass as array directly
      document_ids: documentIds,
      result_limit: topK
    });

    if (error) {
      console.error('❌ Vector search error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No similar chunks found');
      return [];
    }

    console.log(`✅ Found ${data.length} similar chunks`);

    return data.map(chunk => ({
      chunkId: chunk.chunk_id,
      documentId: chunk.document_id,
      text: chunk.text,
      pageNumber: chunk.page_number,
      similarity: chunk.similarity,
      language: chunk.language
    }));

  } catch (error) {
    console.error('❌ Error searching similar chunks:', error.message);
    throw error;
  }
};
/**
 * Alternative: Manual cosine similarity search (if RPC function not available)
 * @param {string} query - Search query
 * @param {array} documentIds - Array of document UUIDs
 * @param {number} topK - Number of results
 * @returns {Promise<array>} - Similar chunks
 */
const searchSimilarChunksManual = async (query, documentIds, topK = 5) => {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Get all chunks from specified documents
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .not('embedding', 'is', null);

    if (error) throw error;

    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Calculate similarity for each chunk
    const chunksWithSimilarity = chunks.map(chunk => {
      const chunkEmbedding = JSON.parse(chunk.embedding);
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      return {
        chunkId: chunk.id,
        documentId: chunk.document_id,
        text: chunk.text,
        pageNumber: chunk.page_number,
        similarity,
        language: chunk.language
      };
    });

    // Sort by similarity (descending) and return top K
    chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
    return chunksWithSimilarity.slice(0, topK);

  } catch (error) {
    console.error('Manual search error:', error.message);
    throw error;
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param {array} vecA - First vector
 * @param {array} vecB - Second vector
 * @returns {number} - Similarity score (0 to 1)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Delete all chunks for a document
 * @param {string} documentId - Document UUID
 * @returns {Promise<void>}
 */
const deleteDocumentChunks = async (documentId) => {
  try {
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (error) throw error;

    console.log(`✅ Deleted chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting chunks:', error.message);
    throw error;
  }
};

/**
 * Get chunk count for a document
 * @param {string} documentId - Document UUID
 * @returns {Promise<number>} - Number of chunks
 */
const getChunkCount = async (documentId) => {
  try {
    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting chunk count:', error.message);
    return 0;
  }
};

module.exports = {
  generateEmbedding,
  storeChunksWithEmbeddings,
  searchSimilarChunks,
  searchSimilarChunksManual,
  cosineSimilarity,
  deleteDocumentChunks,
  getChunkCount
}