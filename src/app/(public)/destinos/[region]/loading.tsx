"use client";

import { Skeleton } from "@/components/public/SkeletonClient";

export default function Loading() {
  return (
    <section className="listing-area">
      <div className="container wide">
        <div className="listing-filter text-center">
          <h1 className="h2" style={{ visibility: "hidden" }}>
            &nbsp;
          </h1>
        </div>
        <div className="row g-lg-4 g-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="col-xxl-3 col-lg-4 col-sm-6" key={i}>
              <Skeleton name="package-card" loading>
                <div style={{ height: 360 }} />
              </Skeleton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
