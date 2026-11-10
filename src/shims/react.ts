// Version en ligne : React est chargé en UMD (global), ce module le ré-exporte.
const R = (window as any).React;
export default R;
export const {
  useState, useEffect, useMemo, useRef, useCallback, useContext, useReducer, useLayoutEffect, useId,
  createContext, createElement, cloneElement, isValidElement, forwardRef, memo, Fragment, Component, Children, StrictMode,
} = R;
