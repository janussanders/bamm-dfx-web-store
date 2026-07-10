import { createActor, type Backend } from "@/backend";
import { useActor as useActorBase } from "@caffeineai/core-infrastructure";

export function useActor() {
  // DDR-003: local ExternalBlob shim vs caffeine package typing — force Backend generic.
  return useActorBase<Backend>(createActor as never);
}
