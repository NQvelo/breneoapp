import { useCallback, useEffect, useState } from "react";
import {
  applyPwaUpdate,
  getRemoteAppVersion,
  initPwaUpdate,
  isAppUpdateReady,
  isPwaUpdateAvailable,
  subscribePwaUpdate,
} from "@/lib/pwaUpdate";

export function usePwaUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(
    isPwaUpdateAvailable,
  );
  const [isAppUpdateReadyState, setIsAppUpdateReady] = useState(
    isAppUpdateReady,
  );
  const [remoteVersion, setRemoteVersion] = useState(getRemoteAppVersion);

  const syncState = useCallback(() => {
    setIsUpdateAvailable(isPwaUpdateAvailable());
    setIsAppUpdateReady(isAppUpdateReady());
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

  return {
    isUpdateAvailable,
    isAppUpdateReady: isAppUpdateReadyState,
    remoteVersion,
    applyUpdate,
  };
}
