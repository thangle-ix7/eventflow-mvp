import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));

const blockedPatterns = [
  /Bấm vào hàng/i,
  /Context cho AI/i,
  /Nhập bối cảnh để/i,
  /Điền thông tin để/i,
  /Sau khi tạo sự kiện/i,
  /Lưu ý khi sửa/i,
  /Gợi ý đặt tên ban/i,
  /placeholder=["'][^"']{70,}["']/i,
];

const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const findings = [];

const getExtension = (filePath) => {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
};

const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.has(getExtension(fullPath))) {
      continue;
    }

    const text = readFileSync(fullPath, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (blockedPatterns.some((pattern) => pattern.test(line))) {
        findings.push(`${fullPath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
};

walk(root);

if (findings.length > 0) {
  console.error('UX copy scan failed. Remove excessive instruction/help copy:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('UX copy scan passed.');
