import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="text-center">
        <p className="font-code text-[12px] text-muted-foreground">404</p>
        <h1 className="mt-2 text-[20px] font-semibold">找不到这一页</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">地址可能拼错了，或者这个策略还没写进指南。</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/" className={buttonVariants({ size: "default" })}>
            回到概览
          </Link>
          <Link to="/calculator" className={buttonVariants({ variant: "outline", size: "default" })}>
            打开构建器
          </Link>
        </div>
      </div>
    </div>
  );
}
