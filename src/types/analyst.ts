/** Core types for TenderBase's premium Bid Analyst workflow. */

export type FitConfidence = 'high' | 'medium' | 'low';

export type FitSignalKind =
  | 'category'
  | 'province'
  | 'locality'
  | 'deadline'
  | 'documents'
  | 'profile'
  | 'eligibility'
  | 'value';

export interface FitSignal {
  kind: FitSignalKind;
  label: string;
  detail: string;
  impact: 'positive' | 'negative' | 'neutral';
  points?: number;
}

export interface FitAnalysis {
  score: number;
  confidence: FitConfidence;
  positives: FitSignal[];
  concerns: FitSignal[];
  missingProfileData: string[];
  calculatedAt: string;
  engineVersion: string;
}

export type AnalysisStatus = 'queued' | 'processing' | 'complete' | 'failed';

export type RequirementCategory =
  | 'eligibility'
  | 'compliance'
  | 'technical'
  | 'financial'
  | 'submission'
  | 'documentation'
  | 'cidb'
  | 'bbbee'
  | 'tax'
  | 'briefing'
  | 'pricing';

export type RequirementStatus =
  | 'unknown'
  | 'complete'
  | 'missing'
  | 'not_applicable'
  | 'needs_review';

export interface DocumentEvidence {
  documentId: string;
  documentName: string;
  page?: number;
  section?: string;
  text: string;
}

export interface TenderRequirement {
  id: string;
  category: RequirementCategory;
  title: string;
  description: string;
  mandatory: boolean;
  status: RequirementStatus;
  evidence: DocumentEvidence[];
}

export interface TenderRisk {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  evidence: DocumentEvidence[];
}

export interface TenderDeadline {
  id: string;
  title: string;
  date: string;
  mandatory: boolean;
  evidence: DocumentEvidence[];
}

export interface TenderAnalysis {
  id: string;
  tenderId: string;
  version: number;
  status: AnalysisStatus;
  executiveSummary: string | null;
  scopeSummary: string | null;
  eligibilitySummary: string | null;
  riskSummary: string | null;
  fit: FitAnalysis | null;
  requirements: TenderRequirement[];
  risks: TenderRisk[];
  deadlines: TenderDeadline[];
  analysedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BidStage =
  | 'qualifying'
  | 'pursuing'
  | 'preparing'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'withdrawn';

export type BidPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface BidOpportunity {
  id: string;
  tenderId: string;
  stage: BidStage;
  priority: BidPriority;
  fitScore: number | null;
  fitConfidence: FitConfidence | null;
  estimatedBidValueCents: number | null;
  winProbability: number | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BidTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface BidTask {
  id: string;
  bidOpportunityId: string;
  title: string;
  description: string | null;
  status: BidTaskStatus;
  priority: BidPriority;
  dueAt: string | null;
  assignedTo: string | null;
  createdAt: string;
  completedAt: string | null;
}
