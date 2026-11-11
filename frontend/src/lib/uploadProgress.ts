import { ApiError } from "./api";

// 11/11/2026 - "KTV up ảnh rồi ấn tạo chờ rất lâu rồi báo lỗi" + "cho hiện trạng tỷ lệ up ảnh lên server":
// fetch() khong bao tien do tai len -> dung XMLHttpRequest (upload.onprogress). Thay vi chan cung theo TONG
// thoi gian (60s cu - mang yeu gui 1-2MB anh se luon vuot), chi bao loi khi KHONG CO BYTE NAO di them trong
// idleMs (mang dung han). Tai len xong thi cho server tra loi toi da waitMs.

export interface UploadProgress {
  loaded: number;
  total: number;
  /** true = da tai len het, dang cho server luu. */
  done: boolean;
}

export function postJsonWithProgress<T>(
  path: string,
  body: unknown,
  onProgress: (p: UploadProgress) => void,
  opts: { idleMs?: number; waitMs?: number } = {},
): Promise<T> {
  const idleMs = opts.idleMs ?? 45000;
  const waitMs = opts.waitMs ?? 45000;
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const payload = JSON.stringify(body);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    const arm = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        xhr.abort();
      }, ms);
    };
    xhr.open("POST", `/api${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = (e) => {
      const total = e.lengthComputable ? e.total : payload.length;
      onProgress({ loaded: e.loaded, total, done: false });
      arm(idleMs);
    };
    xhr.upload.onload = () => {
      onProgress({ loaded: payload.length, total: payload.length, done: true });
      arm(waitMs);
    };
    xhr.onload = () => {
      if (timer) clearTimeout(timer);
      let json: unknown = null;
      try {
        json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        /* no body */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(json as T);
      const code = (json as { error?: string } | null)?.error || `HTTP_${xhr.status}`;
      reject(new ApiError(code, xhr.status));
    };
    xhr.onerror = () => {
      if (timer) clearTimeout(timer);
      reject(new ApiError("NETWORK", 0));
    };
    xhr.onabort = () => {
      if (timer) clearTimeout(timer);
      reject(new ApiError(timedOut ? "TIMEOUT" : "NETWORK", 0));
    };
    onProgress({ loaded: 0, total: payload.length, done: false });
    arm(idleMs);
    xhr.send(payload);
  });
}

export function fmtKb(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
