const pdfParse = require('pdf-parse');
const mammoth = require('mammoth'); // For Word documents
const XLSX = require('xlsx'); // For Excel
const Tesseract = require('tesseract.js'); // For OCR on images
const axios = require('axios');

/**
 * Parse PDF file and extract text with page numbers
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parsePDF = async (buffer) => {
  try {
    console.log('Parsing PDF...');
    const data = await pdfParse(buffer);

    const text = data.text;
    const totalPages = data.numpages;

    console.log(`PDF parsed: ${totalPages} pages, ${text.length} characters`);

    if (!text || text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }

    // Split text by approximate pages
    const textPerPage = text.length / totalPages;
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
      const start = Math.floor(i * textPerPage);
      const end = Math.floor((i + 1) * textPerPage);
      const pageText = text.slice(start, end).trim();

      if (pageText) {
        pages.push({
          pageNumber: i + 1,
          text: pageText
        });
      }
    }

    return {
      text: text.trim(),
      pages,
      totalPages
    };
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

/**
 * Parse Word document (.doc, .docx) and extract text
 * @param {Buffer} buffer - Word file buffer
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parseWord = async (buffer) => {
  try {
    console.log('Parsing Word document...');
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;

    if (!text || text.trim().length === 0) {
      throw new Error('Word document contains no extractable text');
    }

    console.log(`Word parsed: ${text.length} characters`);

    // Word doesn't have page numbers in the same way as PDF
    // Split into pseudo-pages based on paragraphs or character count
    const pseudoPages = splitTextIntoPages(text, 2000); // ~2000 chars per "page"

    return {
      text: text.trim(),
      pages: pseudoPages,
      totalPages: pseudoPages.length
    };
  } catch (error) {
    console.error('Word parsing error:', error.message);
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
};

/**
 * Parse Excel file (.xls, .xlsx) and extract text from all sheets
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parseExcel = async (buffer) => {
  try {
    console.log('Parsing Excel file...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const allText = [];
    const pages = [];

    // Iterate through all sheets
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to CSV format (preserves structure better than JSON)
      const csv = XLSX.utils.sheet_to_csv(sheet);

      if (csv && csv.trim().length > 0) {
        const sheetText = `Sheet: ${sheetName}\n${csv}`;
        allText.push(sheetText);

        pages.push({
          pageNumber: index + 1,
          text: sheetText,
          sheetName: sheetName
        });
      }
    });

    const combinedText = allText.join('\n\n');

    if (!combinedText || combinedText.trim().length === 0) {
      throw new Error('Excel file contains no extractable data');
    }

    console.log(`Excel parsed: ${pages.length} sheets, ${combinedText.length} characters`);

    return {
      text: combinedText.trim(),
      pages,
      totalPages: pages.length
    };
  } catch (error) {
    console.error('Excel parsing error:', error.message);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse image file using OCR (Tesseract)
 * @param {Buffer} buffer - Image file buffer
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parseImage = async (buffer) => {
  try {
    console.log('Parsing image with OCR...');

    // Tesseract.js can work with buffers
    const { data: { text } } = await Tesseract.recognize(
      buffer,
      'eng', // Default to English, can be made configurable
      {
        logger: info => {
          if (info.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );

    if (!text || text.trim().length === 0) {
      throw new Error('Image contains no recognizable text');
    }

    console.log(`Image OCR complete: ${text.length} characters`);

    return {
      text: text.trim(),
      pages: [{
        pageNumber: 1,
        text: text.trim()
      }],
      totalPages: 1
    };
  } catch (error) {
    console.error('Image OCR error:', error.message);
    throw new Error(`Failed to parse image: ${error.message}`);
  }
};

/**
 * Parse plain text file
 * @param {Buffer} buffer - Text file buffer
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parseText = async (buffer) => {
  try {
    console.log('Parsing text file...');
    const text = buffer.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new Error('Text file is empty');
    }

    console.log(`Text parsed: ${text.length} characters`);

    // Split into pseudo-pages
    const pseudoPages = splitTextIntoPages(text, 2000);

    return {
      text: text.trim(),
      pages: pseudoPages,
      totalPages: pseudoPages.length
    };
  } catch (error) {
    console.error('Text parsing error:', error.message);
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
};

/**
 * Main parsing function - routes to appropriate parser based on file type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {string} fileType - File extension
 * @returns {Promise<object>} - { text, pages, totalPages }
 */
const parseFile = async (buffer, mimeType, fileType) => {
  console.log(`Parsing file type: ${fileType} (${mimeType})`);

  try {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return await parsePDF(buffer);

      case 'doc':
      case 'docx':
        return await parseWord(buffer);

      case 'xls':
      case 'xlsx':
        return await parseExcel(buffer);

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return await parseImage(buffer);

      case 'txt':
        return await parseText(buffer);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('File parsing error:', error.message);
    throw error;
  }
};

/**
 * Download file from URL (e.g., Cloudinary) and return buffer
 * @param {string} url - File URL
 * @returns {Promise<Buffer>} - File buffer
 */
const downloadFile = async (url) => {
  try {
    console.log('Downloading file from:', url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('File download error:', error.message);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

/**
 * Helper: Split text into pseudo-pages based on character count
 * @param {string} text - Text to split
 * @param {number} charsPerPage - Characters per page
 * @returns {array} - Array of page objects
 */
const splitTextIntoPages = (text, charsPerPage = 2000) => {
  const pages = [];
  let pageNumber = 1;
  let start = 0;

  while (start < text.length) {
    const end = start + charsPerPage;
    const pageText = text.slice(start, end).trim();

    if (pageText) {
      pages.push({
        pageNumber,
        text: pageText
      });
      pageNumber++;
    }

    start = end;
  }

  return pages;
};

/**
 * Chunk text into smaller pieces for embedding
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk
 * @param {number} overlap - Overlap between chunks
 * @returns {array} - Array of text chunks
 */
const chunkText = (text, chunkSize = 800, overlap = 100) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 50) { // Only meaningful chunks
      chunks.push(chunk);
    }

    start = end - overlap;
  }

  return chunks;
};

module.exports = {
  parseFile,
  parsePDF,
  parseWord,
  parseExcel,
  parseImage,
  parseText,
  downloadFile,
  chunkText
};