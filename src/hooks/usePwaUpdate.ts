import { useCallback, useEffect, useState } from "react";
import {
  applyPwaUpdate,
  getRemoteAppVersion,
  initPwaUpdate,
  isPwaUpdateAvailable,
  subscribePwaUpdate,
} from "@/lib/pwaUpdate";

export function usePwaUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(
    isPwaUpdateAvailable,
  );
  const [remoteVersion, setRemoteVersion] = useState(getRemoteAppVersion);

  const syncState = useCallback(() => {
    setIsUpdateAvailable(isPwaUpdateAvailable());
    setRemoteVersion(getRemoteAppVersion());
  }, []);

  useEffect(() => {
    initPwaUpdate();
    syncState();
    return subscribePwaUpdate(syncState);
  }, [syncState]);

  const applyUpdate = useCallback(async () => {
    await applyPwaUpdate();
  }, []);

  return { isUpdateAvailable, remoteVersion, applyUpdate };
}
