import { createActor } from "@/backend";
import { useActor as useActorBase } from "@caffeineai/core-infrastructure";

export function useActor() {
  return useActorBase(createActor);
}
