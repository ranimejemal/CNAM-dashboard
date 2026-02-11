import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import React from "react";

const FAKE_PROVIDER = {
  id: "fake-provider-1",
  name: "Clinique El Manar",
  provider_code: "CLN-2024-0147",
  type: "hospital" as const,
  specialty: "Médecine générale & Spécialisée",
  address: "Rue du Lac Biwa, Les Berges du Lac, Tunis 1053",
  phone: "+216 71 965 300",
  email: "contact@clinique-elmanar.tn",
  status: "approved" as const,
  approval_date: "2023-03-15",
  invoices_processed: 1247,
  error_rate: 2.3,
  created_at: "2023-01-10T08:00:00Z",
  updated_at: "2024-12-01T10:00:00Z",
};

const FAKE_REIMBURSEMENTS = [
  {
    id: "r1", reference_number: "RMB-2025-00412", service_type: "Consultation générale", amount_requested: 85.00, amount_approved: 65.00, status: "approved",
    created_at: "2025-02-10T09:30:00Z", submission_date: "2025-02-10", description: "Consultation médicale standard",
    insured_member: { first_name: "Mohamed", last_name: "Ben Ali", insurance_number: "CNAM-1089234" },
  },
  {
    id: "r2", reference_number: "RMB-2025-00398", service_type: "Radiologie", amount_requested: 320.00, amount_approved: 280.00, status: "approved",
    created_at: "2025-02-09T14:15:00Z", submission_date: "2025-02-09", description: "Radio thoracique face + profil",
    insured_member: { first_name: "Fatma", last_name: "Gharbi", insurance_number: "CNAM-2056781" },
  },
  {
    id: "r3", reference_number: "RMB-2025-00385", service_type: "Analyse biologique", amount_requested: 145.00, amount_approved: null, status: "pending",
    created_at: "2025-02-08T11:00:00Z", submission_date: "2025-02-08", description: "Bilan sanguin complet NFS + Glycémie",
    insured_member: { first_name: "Ahmed", last_name: "Trabelsi", insurance_number: "CNAM-3012456" },
  },
  {
    id: "r4", reference_number: "RMB-2025-00371", service_type: "Soins dentaires", amount_requested: 250.00, amount_approved: 200.00, status: "approved",
    created_at: "2025-02-07T16:45:00Z", submission_date: "2025-02-07", description: "Extraction + Traitement canalaire",
    insured_member: { first_name: "Salma", last_name: "Hammami", insurance_number: "CNAM-4078923" },
  },
  {
    id: "r5", reference_number: "RMB-2025-00358", service_type: "Consultation spécialisée", amount_requested: 120.00, amount_approved: null, status: "processing",
    created_at: "2025-02-06T10:20:00Z", submission_date: "2025-02-06", description: "Consultation cardiologie + ECG",
    insured_member: { first_name: "Karim", last_name: "Mejri", insurance_number: "CNAM-5034567" },
  },
  {
    id: "r6", reference_number: "RMB-2025-00344", service_type: "Hospitalisation", amount_requested: 1850.00, amount_approved: 1500.00, status: "approved",
    created_at: "2025-02-05T08:00:00Z", submission_date: "2025-02-05", description: "Hospitalisation 3 jours - chirurgie mineure",
    insured_member: { first_name: "Nadia", last_name: "Sassi", insurance_number: "CNAM-6091234" },
  },
  {
    id: "r7", reference_number: "RMB-2025-00330", service_type: "Pharmacie", amount_requested: 78.50, amount_approved: null, status: "rejected",
    created_at: "2025-02-04T13:30:00Z", submission_date: "2025-02-04", description: "Médicaments non conventionnés",
    insured_member: { first_name: "Youssef", last_name: "Bouazizi", insurance_number: "CNAM-7056789" }, rejection_reason: "Médicaments hors nomenclature CNAM",
  },
  {
    id: "r8", reference_number: "RMB-2025-00318", service_type: "Échographie", amount_requested: 180.00, amount_approved: 150.00, status: "approved",
    created_at: "2025-02-03T09:15:00Z", submission_date: "2025-02-03", description: "Échographie abdominale complète",
    insured_member: { first_name: "Leila", last_name: "Chaabane", insurance_number: "CNAM-8023456" },
  },
  {
    id: "r9", reference_number: "RMB-2025-00305", service_type: "Consultation générale", amount_requested: 85.00, amount_approved: null, status: "pending",
    created_at: "2025-02-02T15:00:00Z", submission_date: "2025-02-02", description: "Consultation + Ordonnance",
    insured_member: { first_name: "Amine", last_name: "Khelifi", insurance_number: "CNAM-9045678" },
  },
  {
    id: "r10", reference_number: "RMB-2025-00291", service_type: "Kinésithérapie", amount_requested: 210.00, amount_approved: 180.00, status: "approved",
    created_at: "2025-02-01T11:45:00Z", submission_date: "2025-02-01", description: "10 séances rééducation - lombalgies",
    insured_member: { first_name: "Rim", last_name: "Maalej", insurance_number: "CNAM-1123456" },
  },
  {
    id: "r11", reference_number: "RMB-2025-00278", service_type: "IRM", amount_requested: 450.00, amount_approved: null, status: "processing",
    created_at: "2025-01-30T08:30:00Z", submission_date: "2025-01-30", description: "IRM genou droit",
    insured_member: { first_name: "Hichem", last_name: "Nasr", insurance_number: "CNAM-1234567" },
  },
  {
    id: "r12", reference_number: "RMB-2025-00265", service_type: "Consultation spécialisée", amount_requested: 130.00, amount_approved: 100.00, status: "approved",
    created_at: "2025-01-29T14:00:00Z", submission_date: "2025-01-29", description: "Ophtalmologie - fond d'œil",
    insured_member: { first_name: "Sonia", last_name: "Riahi", insurance_number: "CNAM-1345678" },
  },
  {
    id: "r13", reference_number: "RMB-2025-00252", service_type: "Analyse biologique", amount_requested: 95.00, amount_approved: 80.00, status: "approved",
    created_at: "2025-01-28T10:00:00Z", submission_date: "2025-01-28", description: "Bilan lipidique + Thyroïdien",
    insured_member: { first_name: "Tarek", last_name: "Bouzid", insurance_number: "CNAM-1456789" },
  },
  {
    id: "r14", reference_number: "RMB-2025-00239", service_type: "Soins dentaires", amount_requested: 175.00, amount_approved: null, status: "pending",
    created_at: "2025-01-27T16:30:00Z", submission_date: "2025-01-27", description: "Détartrage + Traitement parodontal",
    insured_member: { first_name: "Ines", last_name: "Jebali", insurance_number: "CNAM-1567890" },
  },
  {
    id: "r15", reference_number: "RMB-2025-00226", service_type: "Pharmacie", amount_requested: 62.00, amount_approved: 55.00, status: "approved",
    created_at: "2025-01-26T09:45:00Z", submission_date: "2025-01-26", description: "Antibiotiques + Anti-inflammatoires",
    insured_member: { first_name: "Walid", last_name: "Ferjani", insurance_number: "CNAM-1678901" },
  },
];

export function usePrestataireDashboardData() {
  const [reimbursements, setReimbursements] = useState<any[]>(FAKE_REIMBURSEMENTS);
  const [providerInfo, setProviderInfo] = useState<any>(FAKE_PROVIDER);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reimbRes, providerRes] = await Promise.all([
        supabase.from("reimbursements").select("*, insured_member:insured_members(first_name, last_name, insurance_number)").order("created_at", { ascending: false }).limit(50),
        supabase.from("health_providers").select("*").limit(1),
      ]);
      // Use real data if available, otherwise keep fake data
      if (reimbRes.data && reimbRes.data.length > 0) {
        setReimbursements(reimbRes.data);
      }
      if (providerRes.data && providerRes.data.length > 0) {
        setProviderInfo(providerRes.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return React.createElement(Badge, { className: "bg-success/10 text-success border-success/30" }, "Approuvé");
      case "rejected": return React.createElement(Badge, { className: "bg-destructive/10 text-destructive border-destructive/30" }, "Rejeté");
      case "processing": return React.createElement(Badge, { className: "bg-info/10 text-info border-info/30" }, "En traitement");
      default: return React.createElement(Badge, { className: "bg-warning/10 text-warning border-warning/30" }, "En attente");
    }
  };

  const stats = {
    total: reimbursements.length,
    pending: reimbursements.filter(r => r.status === "pending").length,
    approved: reimbursements.filter(r => r.status === "approved").length,
    totalAmount: reimbursements.reduce((s, r) => s + Number(r.amount_requested || 0), 0),
    approvedAmount: reimbursements.filter(r => r.status === "approved").reduce((s, r) => s + Number(r.amount_approved || 0), 0),
  };

  return { reimbursements, providerInfo, loading, stats, getStatusBadge, fetchData };
}
