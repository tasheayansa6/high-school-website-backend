import { useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { Button } from '@/components/ui/Button';

import { FeeStructuresSection } from './FeeStructuresSection';
import { StudentFeesSection } from './StudentFeesSection';

type Tab = 'structures' | 'student-fees';

export default function AdminFeesPage() {
  const [tab, setTab] = useState<Tab>('student-fees');

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Fees"
        description="Define fee structures, assign them to students, and record payments."
      >
        <Button
          type="button"
          variant={tab === 'student-fees' ? 'primary' : 'ghost'}
          size="md"
          aria-pressed={tab === 'student-fees'}
          onClick={() => setTab('student-fees')}
        >
          Student fees
        </Button>
        <Button
          type="button"
          variant={tab === 'structures' ? 'primary' : 'ghost'}
          size="md"
          aria-pressed={tab === 'structures'}
          onClick={() => setTab('structures')}
        >
          Fee structures
        </Button>
      </CmsSectionHeader>

      {tab === 'structures' ? <FeeStructuresSection /> : <StudentFeesSection />}
    </div>
  );
}
