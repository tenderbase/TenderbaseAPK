import 'server-only';

import { API_BASE_URL } from '@/lib/tender-api.server';

export interface MunicipalityFacet {
  code: string;
  name: string;
  province: string;
  tenderCount: number;
}

export interface ProcurementTypeFacet {
  procurementType: string;
  count: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Tender API returned ${res.status}`);
  return (await res.json()) as T;
}

export async function getMunicipalityFacets(): Promise<{
  municipalities: MunicipalityFacet[];
  procurementTypes: ProcurementTypeFacet[];
}> {
  try {
    const [municipalities, procurementTypes] = await Promise.all([
      fetchJson<{ municipalities?: MunicipalityFacet[] }>('/municipalities'),
      fetchJson<{ procurementTypes?: ProcurementTypeFacet[] }>('/procurement-types'),
    ]);
    return {
      municipalities: municipalities.municipalities ?? [],
      procurementTypes: procurementTypes.procurementTypes ?? [],
    };
  } catch (error) {
    console.error('[municipality-facets] failed:', error instanceof Error ? error.message : error);
    return { municipalities: [], procurementTypes: [] };
  }
}
