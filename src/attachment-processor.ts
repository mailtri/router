import {
  Attachment,
  ProcessedAttachment,
  CalendarMetadata,
  CalendarEventMetadata,
  ImageMetadata,
  DocumentMetadata,
  ArchiveMetadata,
} from './types';

export class AttachmentProcessor {
  async processAttachment(
    attachment: Attachment,
  ): Promise<ProcessedAttachment> {
    const result: ProcessedAttachment = {
      ...attachment,
      processed: false,
      metadata: {},
    };

    try {
      // Process ICS files
      if (
        attachment.contentType === 'text/calendar' ||
        attachment.filename.endsWith('.ics')
      ) {
        result.metadata = await this.processICSFile(attachment);
        result.processed = true;
      }

      // Process images
      if (attachment.contentType.startsWith('image/')) {
        result.metadata = await this.processImage(attachment);
        result.processed = true;
      }

      // Process documents
      if (this.isDocument(attachment.contentType)) {
        result.metadata = await this.processDocument(attachment);
        result.processed = true;
      }

      // Process archives
      if (this.isArchive(attachment.contentType)) {
        result.metadata = await this.processArchive(attachment);
        result.processed = true;
      }
    } catch (error) {
      result.error = (error as Error).message;
    }

    return result;
  }

  async processAttachments(
    attachments: Attachment[],
  ): Promise<ProcessedAttachment[]> {
    const results: ProcessedAttachment[] = [];

    for (const attachment of attachments) {
      try {
        const processed = await this.processAttachment(attachment);
        results.push(processed);
      } catch (error) {
        // Add failed attachment with error info
        results.push({
          ...attachment,
          processed: false,
          error: (error as Error).message,
          metadata: {},
        });
      }
    }

    return results;
  }

  private async processICSFile(
    attachment: Attachment,
  ): Promise<CalendarMetadata> {
    const content = attachment.content.toString('utf8');

    // Simple ICS parser - in production, use a proper library like ical.js
    const events = this.parseICSContent(content);

    // If no valid events were parsed, consider it corrupted
    if (events.length === 0 && content.trim().length > 0) {
      throw new Error('Invalid or corrupted ICS file');
    }

    return {
      type: 'calendar',
      events: events.map(event => {
        const mappedEvent: CalendarEventMetadata = {};
        if (event.summary) mappedEvent.summary = event.summary;
        if (event.start) mappedEvent.start = event.start;
        if (event.end) mappedEvent.end = event.end;
        if (event.location) mappedEvent.location = event.location;
        if (event.description) mappedEvent.description = event.description;
        return mappedEvent;
      }),
    };
  }

  private parseICSContent(content: string): CalendarEventMetadata[] {
    const events: CalendarEventMetadata[] = [];
    const lines = content.split('\n');
    let currentEvent: CalendarEventMetadata = {};
    let inEvent = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (trimmed === 'END:VEVENT') {
        if (inEvent) {
          events.push(currentEvent);
          inEvent = false;
        }
      } else if (inEvent && trimmed.includes(':')) {
        const [key, rawValue] = trimmed.split(':', 2);
        const cleanKey = (key?.replace(/;.*$/, '') || '').toUpperCase(); // Remove parameters and normalize
        const normalizedValue =
          typeof rawValue === 'string' ? rawValue.trim() : undefined;

        // Skip assigning if the value is missing or empty to avoid empty strings
        if (!normalizedValue) {
          continue;
        }

        switch (cleanKey) {
        case 'SUMMARY':
          currentEvent.summary = normalizedValue;
          break;
        case 'DTSTART':
          currentEvent.start = normalizedValue;
          break;
        case 'DTEND':
          currentEvent.end = normalizedValue;
          break;
        case 'LOCATION':
          currentEvent.location = normalizedValue;
          break;
        case 'DESCRIPTION':
          currentEvent.description = normalizedValue;
          break;
        }
      }
    }

    return events;
  }

  private async processImage(attachment: Attachment): Promise<ImageMetadata> {
    // Extract basic image metadata
    const metadata = await this.extractImageMetadata(attachment.content);

    return {
      type: 'image',
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: attachment.size,
    };
  }

  private async extractImageMetadata(
    content: Buffer,
  ): Promise<{ width: number; height: number; format: string }> {
    // Simple image metadata extraction
    // In production, use a library like sharp or image-size

    const metadata: { width: number; height: number; format: string } = {
      width: 0,
      height: 0,
      format: 'unknown',
    };

    // Check for common image formats
    if (content.length >= 4) {
      const header = content.subarray(0, 4);

      // PNG
      if (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      ) {
        metadata.format = 'png';
        if (content.length >= 24) {
          metadata.width = content.readUInt32BE(16);
          metadata.height = content.readUInt32BE(20);
        }
      }
      // JPEG
      else if (header[0] === 0xff && header[1] === 0xd8) {
        metadata.format = 'jpeg';
        // JPEG dimensions are more complex to extract
        metadata.width = 0;
        metadata.height = 0;
      }
      // GIF
      else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        metadata.format = 'gif';
        if (content.length >= 10) {
          metadata.width = content.readUInt16LE(6);
          metadata.height = content.readUInt16LE(8);
        }
      }
    }

    return metadata;
  }

  private async processDocument(
    attachment: Attachment,
  ): Promise<DocumentMetadata> {
    // Extract document metadata
    const metadata = await this.extractDocumentMetadata(attachment);

    return {
      type: metadata.type || 'document',
      pages: metadata.pages,
      author: metadata.author,
      title: metadata.title,
      size: attachment.size,
    };
  }

  private async extractDocumentMetadata(attachment: Attachment): Promise<{
    type: 'document' | 'pdf' | 'docx';
    pages: number;
    author: string;
    title: string;
    size: number;
  }> {
    // Simple document metadata extraction
    // In production, use libraries like pdf-parse, mammoth, etc.

    const metadata: {
      type: 'document' | 'pdf' | 'docx';
      pages: number;
      author: string;
      title: string;
      size: number;
    } = {
      type: 'document',
      pages: 0,
      author: '',
      title: '',
      size: attachment.size,
    };

    // Basic PDF detection
    if (
      attachment.contentType === 'application/pdf' ||
      attachment.filename.endsWith('.pdf')
    ) {
      metadata.type = 'pdf';
      // PDF metadata extraction would go here
    }

    // Basic Word document detection
    if (
      attachment.contentType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      attachment.filename.endsWith('.docx')
    ) {
      metadata.type = 'docx';
      // Word document metadata extraction would go here
    }

    return metadata;
  }

  private async processArchive(
    attachment: Attachment,
  ): Promise<ArchiveMetadata> {
    // Extract archive metadata
    const metadata = await this.extractArchiveMetadata(attachment);

    return {
      type: 'archive',
      fileCount: metadata.fileCount,
      compressedSize: attachment.size,
      uncompressedSize: metadata.uncompressedSize,
      format: metadata.format,
    };
  }

  private async extractArchiveMetadata(
    attachment: Attachment,
  ): Promise<{ fileCount: number; uncompressedSize: number; format: string }> {
    // Simple archive metadata extraction
    // In production, use libraries like yauzl, tar-stream, etc.

    const metadata: {
      fileCount: number;
      uncompressedSize: number;
      format: string;
    } = {
      fileCount: 0,
      uncompressedSize: 0,
      format: 'unknown',
    };

    // Basic ZIP detection
    if (
      attachment.contentType === 'application/zip' ||
      attachment.filename.endsWith('.zip')
    ) {
      metadata.format = 'zip';
      // ZIP metadata extraction would go here
    }

    // Basic TAR detection
    if (
      attachment.contentType === 'application/x-tar' ||
      attachment.filename.endsWith('.tar')
    ) {
      metadata.format = 'tar';
      // TAR metadata extraction would go here
    }

    return metadata;
  }

  private isDocument(contentType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
    ];

    return documentTypes.includes(contentType);
  }

  private isArchive(contentType: string): boolean {
    const archiveTypes = [
      'application/zip',
      'application/x-tar',
      'application/gzip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    return archiveTypes.includes(contentType);
  }
}
