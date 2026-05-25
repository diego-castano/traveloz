"use client";

import { Skeleton } from "@/components/public/SkeletonClient";

// The sidebar is NOT wrapped in <Skeleton> in PackageDetailView (would break
// its position: sticky), so no `package-detail-sidebar` bone exists. We render
// a plain shimmering block here as its loading placeholder.
const SIDEBAR_PLACEHOLDER_STYLE: React.CSSProperties = {
  height: 540,
  borderRadius: 12,
  backgroundImage:
    "linear-gradient(110deg, #ECECEC 30%, #F7F7F7 50%, #ECECEC 70%)",
  backgroundSize: "200% 100%",
  animation: "pkg-sidebar-shimmer 1.8s linear infinite",
};

export default function Loading() {
  return (
    <section className="content-area gradient-page-bg ver2 pkg-detail">
      <style>{`@keyframes pkg-sidebar-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="container wide">
        <div className="row">
          <div className="col-lg-8 col-md-7">
            <Skeleton name="package-detail-main" loading>
              <div style={{ height: 720 }} />
            </Skeleton>
          </div>
          <div className="col-lg-4 col-md-5">
            <div style={SIDEBAR_PLACEHOLDER_STYLE} />
          </div>
        </div>
      </div>
    </section>
  );
}
