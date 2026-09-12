import { Suspense } from 'react';
import { SearchView } from './SearchView';
import { listTenders } from '@/lib/tenders';
import { getMunicipalityFacets } from '@/lib/municipality-facets.server';
import type { SortOption } from '@/types/tender';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = one(searchParams.q) ?? '';
  const sort = (one(searchParams.sort) as SortOption) ?? 'newest';
  const page = Number(one(searchParams.page) ?? 1);
  const municipality = one(searchParams.municipality);
  const municipalityCode = one(searchParams.municipalityCode);
  const procurementType = one(searchParams.procurementType);

  const [data, facets] = await Promise.all([
    listTenders({
      query: q || undefined,
      category: one(searchParams.category),
      province: one(searchParams.province),
      status: one(searchParams.status),
      municipality,
      municipalityCode,
      procurementType,
      closingWithin: one(searchParams.closingWithin),
      sort,
      page,
      limit: 20,
    }),
    getMunicipalityFacets(),
  ]);

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
        municipalities={facets.municipalities}
        procurementTypes={facets.procurementTypes}
      />
    </Suspense>
  );
}
