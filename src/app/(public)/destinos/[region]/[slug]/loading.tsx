"use client";

import { Skeleton } from "@/components/public/SkeletonClient";

export default function Loading() {
  return (
    <section className="content-area gradient-page-bg ver2 pkg-detail">
      <div className="container wide">
        <div className="row">
          <div className="col-lg-8 col-md-7">
            <Skeleton name="package-detail-main" loading>
              <div style={{ height: 720 }} />
            </Skeleton>
          </div>
          <div className="col-lg-4 col-md-5">
            <Skeleton name="package-detail-sidebar" loading>
              <div style={{ height: 540 }} />
            </Skeleton>
          </div>
        </div>
      </div>
    </section>
  );
}
