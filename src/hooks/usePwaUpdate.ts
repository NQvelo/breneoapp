import { useCallback, useEffect, useState } from "react";
import {
  applyPwaUpdate,
  initPwaUpdate,
  isPwaUpdateAvailable,
  subscribePwaUpdate,
} from "@/lib/pwaUpdate";

export function usePwaUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(
    isPwaUpdateAvailable,
  );

  const syncState = useCallback(() => {
    setIsUpdateAvailable(isPwaUpdateAvailable());
  }, []);

  useEffect(() => {
    initPwaUpdate();
    syncState();
    return subscribePwaUpdate(syncState);
  }, [syncState]);

  const applyUpdate = useCallback(async () => {
    await applyPwaUpdate();
  }, []);

  return { isUpdateAvailable, applyUpdate };
}
