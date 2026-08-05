"use client";

import { Skeleton } from "@/components/public/SkeletonClient";

export default function Loading() {
  return (
    <section className="content-area">
      <div className="container">
        <div className="text-center mb_50">
          {/* Mismas clases que el h1 real para que el hueco reservado mida
              igual que el titulo definitivo (listing-heading lo achica en
              mobile). */}
          <h1 className="section-heading listing-heading" style={{ visibility: "hidden" }}>
            &nbsp;
          </h1>
        </div>
        <div className="row">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="col-lg-4 col-sm-6 mb-4" key={i}>
              <Skeleton name="region-card" loading>
                <div style={{ height: 260 }} />
              </Skeleton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
