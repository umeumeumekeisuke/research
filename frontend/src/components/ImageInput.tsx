import React, { useRef } from 'react';
import { Camera, Image } from 'lucide-react';

interface ImageInputProps {
  onImageUpload: (imageData: string, description: string) => void;
}

export const ImageInput: React.FC<ImageInputProps> = ({ onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB制限)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      const description = `画像をアップロードしました: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
      onImageUpload(imageData, description);
    };
    reader.readAsDataURL(file);

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={triggerFileInput}
        className="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
        title="画像をアップロード"
      >
        <Camera size={20} />
      </button>
    </>
  );
};