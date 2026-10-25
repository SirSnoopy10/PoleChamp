import { useCallback, useState } from 'react';

/** Stan otwarcia arkusza z ekranu: `const s = useSheet(); <Sheet {...s.props}>`. */
export function useSheet(initial = false) {
  const [visible, setVisible] = useState(initial);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  return { visible, open, close, props: { visible, onClose: close } };
}
