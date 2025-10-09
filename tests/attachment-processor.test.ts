import { AttachmentProcessor } from '../src/attachment-processor';
import {
  Attachment,
  CalendarMetadata,
  ImageMetadata,
  DocumentMetadata,
  ArchiveMetadata,
} from '../src/types';

describe('AttachmentProcessor', () => {
  let processor: AttachmentProcessor;

  beforeEach(() => {
    processor = new AttachmentProcessor();
  });

  describe('ICS File Processing', () => {
    it('should process ICS calendar files', async() => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test@example.com
DTSTART:20240101T120000Z
DTEND:20240101T130000Z
SUMMARY:Test Meeting
LOCATION:Conference Room
DESCRIPTION:This is a test meeting
END:VEVENT
END:VCALENDAR`;

      const attachment: Attachment = {
        filename: 'test.ics',
        contentType: 'text/calendar',
        size: icsContent.length,
        content: Buffer.from(icsContent),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as CalendarMetadata;
      expect(metadata.type).toBe('calendar');
      expect(metadata.events).toHaveLength(1);
      expect(metadata.events[0]?.summary).toBe('Test Meeting');
      expect(metadata.events[0]?.start).toBe('20240101T120000Z');
      expect(metadata.events[0]?.end).toBe('20240101T130000Z');
    });

    it('should handle multiple events in ICS file', async() => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test1@example.com
DTSTART:20240101T120000Z
DTEND:20240101T130000Z
SUMMARY:Meeting 1
END:VEVENT
BEGIN:VEVENT
UID:test2@example.com
DTSTART:20240102T120000Z
DTEND:20240102T130000Z
SUMMARY:Meeting 2
END:VEVENT
END:VCALENDAR`;

      const attachment: Attachment = {
        filename: 'test.ics',
        contentType: 'text/calendar',
        size: icsContent.length,
        content: Buffer.from(icsContent),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as CalendarMetadata;
      expect(metadata.events).toHaveLength(2);
      expect(metadata.events[0]?.summary).toBe('Meeting 1');
      expect(metadata.events[1]?.summary).toBe('Meeting 2');
    });
  });

  describe('Image Processing', () => {
    it('should process PNG images', async() => {
      // Create a minimal PNG file
      const pngHeader = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR
        0x00,
        0x00,
        0x00,
        0x64, // width: 100
        0x00,
        0x00,
        0x00,
        0x64, // height: 100
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // bit depth, color type, etc.
        0x90,
        0x77,
        0x53,
        0xde, // CRC
      ]);

      const attachment: Attachment = {
        filename: 'test.png',
        contentType: 'image/png',
        size: pngHeader.length,
        content: pngHeader,
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as ImageMetadata;
      expect(metadata.type).toBe('image');
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('should process JPEG images', async() => {
      // Create a minimal JPEG file
      const jpegHeader = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0, // JPEG signature
        0x00,
        0x10,
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01, // JFIF header
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00,
      ]);

      const attachment: Attachment = {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        size: jpegHeader.length,
        content: jpegHeader,
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as ImageMetadata;
      expect(metadata.type).toBe('image');
      expect(metadata.format).toBe('jpeg');
    });

    it('should process GIF images', async() => {
      // Create a minimal GIF file
      const gifHeader = Buffer.from([
        0x47,
        0x49,
        0x46,
        0x38,
        0x39,
        0x61, // GIF89a signature
        0x64,
        0x00, // width: 100
        0x64,
        0x00, // height: 100
        0x80,
        0x00,
        0x00,
        0xff,
        0xff,
        0xff,
        0x00,
        0x00,
        0x00,
        0x2c,
        0x00,
        0x00,
        0x00,
        0x00,
        0x64,
        0x00,
        0x64,
        0x00,
        0x00,
        0x02,
        0x00,
        0x3b,
      ]);

      const attachment: Attachment = {
        filename: 'test.gif',
        contentType: 'image/gif',
        size: gifHeader.length,
        content: gifHeader,
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as ImageMetadata;
      expect(metadata.type).toBe('image');
      expect(metadata.format).toBe('gif');
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });
  });

  describe('Document Processing', () => {
    it('should process PDF documents', async() => {
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
200
%%EOF`;

      const attachment: Attachment = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: pdfContent.length,
        content: Buffer.from(pdfContent),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as DocumentMetadata;
      expect(metadata.type).toBe('pdf');
      expect(metadata.size).toBe(pdfContent.length);
    });

    it('should process Word documents', async() => {
      const attachment: Attachment = {
        filename: 'test.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
        content: Buffer.alloc(1024),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as DocumentMetadata;
      expect(metadata.type).toBe('docx');
      expect(metadata.size).toBe(1024);
    });
  });

  describe('Archive Processing', () => {
    it('should process ZIP archives', async() => {
      const attachment: Attachment = {
        filename: 'test.zip',
        contentType: 'application/zip',
        size: 1024,
        content: Buffer.alloc(1024),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as ArchiveMetadata;
      expect(metadata.type).toBe('archive');
      expect(metadata.format).toBe('zip');
      expect(metadata.compressedSize).toBe(1024);
    });

    it('should process TAR archives', async() => {
      const attachment: Attachment = {
        filename: 'test.tar',
        contentType: 'application/x-tar',
        size: 1024,
        content: Buffer.alloc(1024),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      const metadata = result.metadata as ArchiveMetadata;
      expect(metadata.type).toBe('archive');
      expect(metadata.format).toBe('tar');
      expect(metadata.compressedSize).toBe(1024);
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async() => {
      const attachment: Attachment = {
        filename: 'corrupted.ics',
        contentType: 'text/calendar',
        size: 10,
        content: Buffer.from('corrupted'),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown attachment types', async() => {
      const attachment: Attachment = {
        filename: 'unknown.xyz',
        contentType: 'application/unknown',
        size: 100,
        content: Buffer.alloc(100),
      };

      const result = await processor.processAttachment(attachment);

      expect(result.processed).toBe(false);
      expect(result.metadata).toEqual({});
    });
  });

  describe('File Type Detection', () => {
    it('should detect document types correctly', () => {
      const processor = new AttachmentProcessor();

      // Test document type detection
      expect(processor['isDocument']('application/pdf')).toBe(true);
      expect(processor['isDocument']('application/msword')).toBe(true);
      expect(processor['isDocument']('text/plain')).toBe(true);
      expect(processor['isDocument']('image/png')).toBe(false);
    });

    it('should detect archive types correctly', () => {
      const processor = new AttachmentProcessor();

      // Test archive type detection
      expect(processor['isArchive']('application/zip')).toBe(true);
      expect(processor['isArchive']('application/x-tar')).toBe(true);
      expect(processor['isArchive']('application/gzip')).toBe(true);
      expect(processor['isArchive']('text/plain')).toBe(false);
    });
  });
});
