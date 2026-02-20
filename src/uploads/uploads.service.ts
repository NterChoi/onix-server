import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class UploadsService {
  // 실제 S3 등으로 전환 시 이 메서드 내부 로직만 변경하면 됩니다.
  async saveImage(file: Express.Multer.File): Promise<{ url: string; fileName: string }> {
    const fileExt = extname(file.originalname);
    const fileName = `${randomUUID()}${fileExt}`;
    
    // 현재는 MulterStorage(Disk)가 이미 파일을 저장한 상태이므로 
    // DB용 URL과 저장된 파일명만 반환합니다.
    return {
      url: `/uploads/${file.filename}`, // 정적 파일 접근 경로
      fileName: file.filename,
    };
  }
}
