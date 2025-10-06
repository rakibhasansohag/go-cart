/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

// ERROR : IF THE USE onclcik gives error ww will use this
export default function useOnClickOutside(
	ref: React.RefObject<HTMLElement | null>,
	handler: (ev: MouseEvent | TouchEvent) => void,
) {
	useEffect(() => {
		const listener = (event: MouseEvent | TouchEvent) => {
			const el = ref?.current;
			if (!el || el.contains((event as any).target as Node)) return;
			handler(event);
		};
		document.addEventListener('mousedown', listener);
		document.addEventListener('touchstart', listener);
		return () => {
			document.removeEventListener('mousedown', listener);
			document.removeEventListener('touchstart', listener);
		};
	}, [ref, handler]);
}
