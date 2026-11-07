import type { ReactNode } from "react";
import { DetailScroll, PaneHeader } from "../desktop/Split";

function LegalPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <>
      <PaneHeader title={title} subtitle="最后更新：2026 年 11 月 7 日" />
      <DetailScroll>
        <div className="max-w-[680px]">
          <p className="text-[13px] leading-5 text-muted">{lead}</p>
          <div className="mt-6 space-y-5">{children}</div>
        </div>
      </DetailScroll>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold">{title}</h2>
      <p className="mt-1.5 text-[12px] leading-5 text-muted">{children}</p>
    </section>
  );
}

export function Terms() {
  return (
    <LegalPage
      title="使用条款"
      lead="使用本应用前，请先读这一页。简短版本：它是教育工具，不是投资建议。"
    >
      <Section title="用途">
        期权盈亏图用于学习与情景分析。所有价格、图表、概率与希腊值都是模型输出，
        不构成买卖任何证券或衍生品的建议、要约或招揽。
      </Section>
      <Section title="风险">
        期权交易可能导致全部权利金损失，裸卖期权理论上亏损无上限。历史表现与模型输出都不预示未来结果。
        任何交易决定都由你自己做出并承担后果。
      </Section>
      <Section title="数据">
        行情为延迟数据，可能不完整或不准确。保存的交易、自选与设置只存在你自己的设备上，
        我们不会收集你的持仓。
      </Section>
      <Section title="责任限制">
        在适用法律允许的范围内，本应用不对因使用或无法使用本应用而产生的任何损失承担责任。
      </Section>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="隐私" lead="不用账户，不建个人档案。你的交易只留在本机。">
      <Section title="我们收集什么">
        本应用不需要注册，也不收集姓名、邮箱或券商账户信息。保存的策略、自选列表与偏好设置写入本机存储，
        不会上传到服务器。
      </Section>
      <Section title="分析">
        桌面版不包含第三方追踪脚本，也没有遥测。应用不会在后台发起网络请求来同步你的使用情况。
      </Section>
      <Section title="删除数据">
        在「设置 → 数据」中可以删除保存的策略、窗口尺寸记录，或清除全部本地数据。
      </Section>
    </LegalPage>
  );
}
