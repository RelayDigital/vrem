'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyJobsIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/jobs/all-jobs');
  }, [router]);

  return null;
}
