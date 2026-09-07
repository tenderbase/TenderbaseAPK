import { Suspense } from 'react';
import { SearchView } from './SearchView';
import { listTenders } from '@/lib/tenders';
import type { SortOption } from '@/types/tender';

export const revalidate = 300;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = one(searchParams.q) ?? '';
  const sort = (one(searchParams.sort) as SortOption) ?? 'newest';
  const page = Number(one(searchParams.page) ?? 1);

  const data = await listTenders({
    query: q || undefined,
    category: one(searchParams.category),
    province: one(searchParams.province),
    closingWithin: one(searchParams.closingWithin),
    sort,
    page,
    limit: 20,
  });

  return (
    <Suspense fallback={null}>
      <SearchView
        results={data.results}
        total={data.total}
        page={data.page}
        totalPages={data.totalPages}
        source={data.source}
        notice={data.notice}
        initialQuery={q}
        activeSort={sort}
      />
    </Suspense>
  );
}
