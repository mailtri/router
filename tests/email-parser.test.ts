import { EmailParser, EmailParsingError } from '../src/email-parser';

describe('EmailParser', () => {
  let parser: EmailParser;

  beforeEach(() => {
    parser = new EmailParser();
  });

  describe('Basic Email Parsing', () => {
    it('should parse a simple email', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.body.normalized).toBe('This is a test email body.');
    });

    it('should handle emails without subject', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.subject).toBe('');
      expect(result.body.normalized).toBe('This is a test email body.');
    });

    it('should handle emails with empty body', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.subject).toBe('Test Subject');
      expect(result.body.normalized).toBe('');
    });
  });

  describe('Plus-Addressing Support', () => {
    it('should parse plus-addressed emails', async() => {
      const emailContent = `From: test@example.com
To: user+task@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.to[0]?.address).toBe('user+task@example.com');
    });

    it('should handle multiple plus signs', async() => {
      const emailContent = `From: test@example.com
To: user+task+urgent@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.to[0]?.address).toBe('user+task+urgent@example.com');
    });

    it('should handle plus-addressing with special characters', async() => {
      const emailContent = `From: test@example.com
To: user+task-urgent@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.to[0]?.address).toBe('user+task-urgent@example.com');
    });
  });

  describe('Case-Insensitive Processing', () => {
    it('should handle email addresses in any case', async() => {
      const emailContent = `From: TEST@EXAMPLE.COM
To: RECIPIENT@EXAMPLE.COM
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
      expect(result.from.original).toBe('TEST@EXAMPLE.COM');
      expect(result.to[0]?.original).toBe('RECIPIENT@EXAMPLE.COM');
    });
  });

  describe('Unicode & Internationalization', () => {
    it('should handle Unicode in email headers', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: =?UTF-8?B?VGVzdCDwn5iA?=
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.subject).toContain('Test');
    });

    it('should handle Unicode in email body', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email with emoji 🚀 and unicode characters.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toContain('🚀');
    });

    it('should handle internationalized domain names', async() => {
      const emailContent = `From: test@example.com
To: recipient@测试.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.to[0]?.address).toBe('recipient@测试.com');
    });
  });

  describe('MIME Handling', () => {
    it('should parse multipart/alternative emails', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is the plain text version.

--boundary123
Content-Type: text/html

<html><body>This is the <b>HTML</b> version.</body></html>

--boundary123--`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.text).toContain('plain text version');
      expect(result.body.html).toContain('<b>HTML</b>');
      expect(result.body.normalized).toContain('plain text version');
    });

    it('should parse multipart/mixed emails with attachments', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is the email body.

--boundary123
Content-Type: application/pdf
Content-Disposition: attachment; filename="test.pdf"

%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

--boundary123--`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toBe('This is the email body.');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]?.filename).toBe('test.pdf');
      expect(result.attachments[0]?.contentType).toBe('application/pdf');
    });

    it('should handle embedded messages', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is the email body.

--boundary123
Content-Type: message/rfc822

From: embedded@example.com
To: original@example.com
Subject: Embedded Message
Date: Mon, 1 Jan 2024 11:00:00 +0000

This is an embedded message.

--boundary123--`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toBe('This is the email body.');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]?.contentType).toBe('message/rfc822');
    });
  });

  describe('Content Normalization', () => {
    it('should normalize HTML content', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Type: text/html

<html>
<head><title>Test</title></head>
<body>
  <p>This is a <b>test</b> email with <i>formatting</i>.</p>
  <script>alert('test');</script>
  <style>body { color: red; }</style>
</body>
</html>`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.html).toContain('<b>test</b>');
      expect(result.body.normalized).toBe('This is a test email with formatting.');
      expect(result.body.normalized).not.toContain('<script>');
      expect(result.body.normalized).not.toContain('<style>');
    });

    it('should handle quoted-printable encoding', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Transfer-Encoding: quoted-printable

This is a test email with=0Aline breaks and special=20characters.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toContain('line breaks');
      expect(result.body.normalized).toContain('special characters');
    });

    it('should handle base64 encoding', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>
Content-Transfer-Encoding: base64

VGhpcyBpcyBhIHRlc3QgZW1haWwgd2l0aCBiYXNlNjQgZW5jb2Rpbmcu`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toContain('test email with base64 encoding');
    });

    it('should normalize line endings', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email\r\nwith different\rline endings\nand multiple\n\n\nspaces.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.body.normalized).toBe('This is a test email\nwith different\nline endings\nand multiple\n\nspaces.');
    });
  });

  // Command extraction tests removed - AI will handle intent extraction downstream

  describe('Error Handling', () => {
    it('should handle malformed email headers', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.from.address).toBe('test@example.com');
      expect(result.to[0]?.address).toBe('recipient@example.com');
    });

    it('should handle emails with missing required headers', async() => {
      const emailContent = `Subject: Test Subject

This is a test email body.`;

      const result = await parser.parseEmail(Buffer.from(emailContent));

      expect(result.subject).toBe('Test Subject');
      expect(result.body.normalized).toBe('This is a test email body.');
    });

    it('should throw EmailParsingError for completely malformed emails', async() => {
      const emailContent = 'This is not a valid email format';

      await expect(parser.parseEmail(Buffer.from(emailContent)))
        .rejects.toThrow(EmailParsingError);
    });
  });

  describe('Performance', () => {
    it('should parse emails quickly', async() => {
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

This is a test email body.`;

      const startTime = Date.now();
      await parser.parseEmail(Buffer.from(emailContent));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should parse in less than 1 second
    });

    it('should handle large emails efficiently', async() => {
      const largeBody = 'This is a test email body. '.repeat(10000);
      const emailContent = `From: test@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 1 Jan 2024 12:00:00 +0000
Message-ID: <test@example.com>

${largeBody}`;

      const startTime = Date.now();
      const result = await parser.parseEmail(Buffer.from(emailContent));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should parse in less than 2 seconds
      expect(result.body.normalized).toContain('This is a test email body.');
    });
  });
});
