// /app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404 - 페이지를 찾을 수 없습니다</h1>
      <p className="text-lg text-gray-400">요청하신 페이지가 존재하지 않습니다.</p>
    </div>
  );
}