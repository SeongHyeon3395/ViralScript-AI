import type { Metadata } from 'next';
import MasterConsole from './MasterConsole';

export const metadata: Metadata = {
  title: 'Master Console — ViralScript AI',
  robots: { index: false, follow: false, nocache: true },
};

export default function MasterPage() {
  return <MasterConsole />;
}