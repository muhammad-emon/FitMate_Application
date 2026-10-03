import React, { createContext, useContext, useState } from 'react';

const NavContext = createContext(null);

export function useNav() {
  return useContext(NavContext);
}

export function NavProvider({ children, initialRoute }) {
  const [route, setRoute] = useState(initialRoute);
  const [params, setParams] = useState({});

  function navigate(name, p = {}) {
    setRoute(name);
    setParams(p);
  }

  function goBack() {
    // each stack handles its own back for now
  }

  return (
    <NavContext.Provider value={{ route, params, navigate, goBack }}>
      {children}
    </NavContext.Provider>
  );
}
