"use client";

// Thin client boundary around boneyard's <Skeleton>. Lets server components
// (PackageCard, DestinosGrid, etc.) import it directly without each file
// having to declare "use client". Children pass through as RSC payload.
export { Skeleton } from "boneyard-js/react";
