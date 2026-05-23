import { createContext, useContext, useState } from 'react';

const AvatarCtx = createContext({ avatar: null, setAvatar: () => {} });

export function AvatarProvider({ emis_id, children }) {
  const key = `av_${emis_id}`;
  const [avatar, setAvatarState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  });

  const setAvatar = (av) => {
    localStorage.setItem(key, JSON.stringify(av));
    setAvatarState(av);
  };

  return <AvatarCtx.Provider value={{ avatar, setAvatar }}>{children}</AvatarCtx.Provider>;
}

export const useAvatar = () => useContext(AvatarCtx);
