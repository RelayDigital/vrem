'use client';

import DispatcherLayout from '../dispatcher/layout';

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reuse dispatcher shell (header + sidebar + padding)
  return <DispatcherLayout>{children}</DispatcherLayout>;
}
