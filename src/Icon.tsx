export default function Icon({ name, size = 18 }: { name: 'upload' | 'play' | 'pause' | 'reset' | 'file' | 'arrow' | 'shield' | 'close'; size?: number }) {
  const paths = {
    upload: <><path d="M12 16V3m-5 5 5-5 5 5" /><path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" strokeLinejoin="round" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="3.5" /></>,
    reset: <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>,
    file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M8 12h8M8 16h5" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">{paths[name]}</svg>;
}
