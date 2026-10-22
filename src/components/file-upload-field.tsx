"use client";

import { useEffect, useId, useRef, useState } from "react";

type FileUploadFieldProps = {
  label: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
  helperText?: string;
  multiple?: boolean;
  variant?: "image" | "pdf";
  currentImageUrl?: string | null;
  disabled?: boolean;
};

function acceptsFile(file: File, accept: string) {
  const acceptedTypes = accept
    .split(",")
    .map((item) => item.trim().toLowerCase());

  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) {
      return fileName.endsWith(type);
    }

    if (type.endsWith("/*")) {
      return mimeType.startsWith(type.slice(0, -1));
    }

    return mimeType === type;
  });
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  label,
  accept,
  files,
  onChange,
  helperText,
  multiple = false,
  variant = "image",
  currentImageUrl,
  disabled = false
}: FileUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urls = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));

    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFiles(selectedFiles: File[]) {
    const validFiles = selectedFiles.filter((file) =>
      acceptsFile(file, accept)
    );

    if (validFiles.length !== selectedFiles.length) {
      setError("Alguns arquivos foram ignorados por possuírem formato inválido.");
    } else {
      setError("");
    }

    if (validFiles.length === 0) {
      return;
    }

    onChange(multiple ? [...files, ...validFiles] : [validFiles[0]]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_file, fileIndex) => fileIndex !== index));
  }

  const existingImage =
    !multiple && files.length === 0 && currentImageUrl
      ? currentImageUrl
      : null;

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700">
        {label}
      </span>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();

          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          if (!disabled) {
            handleFiles(Array.from(event.dataTransfer.files));
          }
        }}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition ${dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {existingImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={existingImage}
            alt="Imagem atual"
            className="mb-3 h-24 w-24 rounded-xl object-cover"
          />
        ) : (
          <div className="mb-3 text-4xl text-slate-400">
            {variant === "pdf" ? "PDF" : "＋"}
          </div>
        )}

        <span className="text-sm font-semibold text-slate-700">
          {existingImage
            ? "Clique para substituir a imagem"
            : "Clique ou arraste o arquivo para esta área"}
        </span>

        {helperText && (
          <span className="mt-1 text-xs text-slate-500">
            {helperText}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {error && (
        <p className="text-xs text-amber-700">{error}</p>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2"
            >
              {previews[index] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-xs font-bold text-red-600">
                  PDF
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}