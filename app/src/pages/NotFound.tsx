import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="text-center">
        <p className="font-code text-[11px] text-faint">404</p>
        <h1 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">找不到这一页</h1>
        <p className="mt-1.5 text-[12px] text-muted">地址可能拼错了，或者这个策略还没写进指南。</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/" className="btn-primary h-8 px-3">
            回到概览
          </Link>
          <Link to="/calculator" className="btn-secondary h-8 px-3">
            打开构建器
          </Link>
        </div>
      </div>
    </div>
  );
}
