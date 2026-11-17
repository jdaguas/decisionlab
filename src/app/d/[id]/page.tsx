import { Suspense } from "react";
import Workspace from "./Workspace";

export default function Page() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}
