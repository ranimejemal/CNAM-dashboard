import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import React from "react";

const FAKE_MEMBER = {
  id: "fake-member-1",
  first_name: "Sami",
  last_name: "Ben Youssef",
  cin: "09876543",
  insurance_number: "CNAM-2089456",
  date_of_birth: "1990-06-15",
  email: "sami.benyoussef@email.tn",
  phone: "+216 55 234 567",
  address: "12 Rue Ibn Khaldoun, Sousse 4000",
  status: "active",
  card_expiry_date: "2026-12-31",
  created_at: "2022-09-01T08:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
};

const FAKE_REIMBURSEMENTS = [
  {
    id: "ur1", reference_number: "RMB-2025-01234", service_type: "Consultation générale", amount_requested: 85.00, amount_approved: 65.00, status: "approved",
    created_at: "2025-02-10T09:30:00Z", description: "Consultation médecin traitant",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Dr. Khaled Mansour" },
  },
  {
    id: "ur2", reference_number: "RMB-2025-01198", service_type: "Pharmacie", amount_requested: 124.50, amount_approved: 98.00, status: "approved",
    created_at: "2025-02-08T14:15:00Z", description: "Médicaments prescrits - antibiotiques",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Pharmacie Centrale Sousse" },
  },
  {
    id: "ur3", reference_number: "RMB-2025-01156", service_type: "Analyse biologique", amount_requested: 195.00, amount_approved: null, status: "pending",
    created_at: "2025-02-06T11:00:00Z", description: "Bilan sanguin complet + Thyroïdien",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Laboratoire BioSanté" },
  },
  {
    id: "ur4", reference_number: "RMB-2025-01089", service_type: "Radiologie", amount_requested: 280.00, amount_approved: 250.00, status: "approved",
    created_at: "2025-02-03T16:45:00Z", description: "Radio thoracique face + profil",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Centre d'Imagerie El Farabi" },
  },
  {
    id: "ur5", reference_number: "RMB-2025-01045", service_type: "Consultation spécialisée", amount_requested: 120.00, amount_approved: null, status: "processing",
    created_at: "2025-01-30T10:20:00Z", description: "Consultation ORL + audiogramme",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Dr. Amira Belhadj" },
  },
  {
    id: "ur6", reference_number: "RMB-2025-00978", service_type: "Soins dentaires", amount_requested: 350.00, amount_approved: 280.00, status: "approved",
    created_at: "2025-01-27T08:00:00Z", description: "Traitement canalaire + couronne",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Cabinet Dentaire Dr. Haddad" },
  },
  {
    id: "ur7", reference_number: "RMB-2025-00912", service_type: "Kinésithérapie", amount_requested: 180.00, amount_approved: null, status: "rejected",
    created_at: "2025-01-24T13:30:00Z", description: "Séances de rééducation - épaule",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Centre Kiné Santé Plus" },
    rejection_reason: "Ordonnance médicale expirée - veuillez fournir une ordonnance récente",
  },
  {
    id: "ur8", reference_number: "RMB-2025-00856", service_type: "Échographie", amount_requested: 160.00, amount_approved: 140.00, status: "approved",
    created_at: "2025-01-20T09:15:00Z", description: "Échographie abdominale",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Clinique El Manar" },
  },
  {
    id: "ur9", reference_number: "RMB-2025-00789", service_type: "Pharmacie", amount_requested: 67.00, amount_approved: 55.00, status: "approved",
    created_at: "2025-01-16T15:00:00Z", description: "Anti-inflammatoires + pommade",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Pharmacie Ibn Sina" },
  },
  {
    id: "ur10", reference_number: "RMB-2025-00712", service_type: "Consultation générale", amount_requested: 85.00, amount_approved: null, status: "pending",
    created_at: "2025-01-12T11:45:00Z", description: "Visite de contrôle annuelle",
    insured_member: { first_name: "Sami", last_name: "Ben Youssef" },
    provider: { name: "Dr. Khaled Mansour" },
  },
];

const FAKE_DOCUMENTS = [
  {
    id: "d1", document_type: "Attestation", file_name: "attestation_affiliation_2025.pdf", file_url: "fake/attestation.pdf",
    file_size: 245760, status: "approved", created_at: "2025-02-01T10:00:00Z", validation_notes: "Document vérifié et validé",
  },
  {
    id: "d2", document_type: "Ordonnance", file_name: "ordonnance_dr_mansour_fev2025.pdf", file_url: "fake/ordonnance.pdf",
    file_size: 128000, status: "approved", created_at: "2025-02-08T14:30:00Z", validation_notes: null,
  },
  {
    id: "d3", document_type: "Facture", file_name: "facture_pharmacie_centrale.pdf", file_url: "fake/facture1.pdf",
    file_size: 98304, status: "pending", created_at: "2025-02-09T09:15:00Z", validation_notes: null,
  },
  {
    id: "d4", document_type: "Certificat", file_name: "certificat_medical_jan2025.pdf", file_url: "fake/certificat.pdf",
    file_size: 184320, status: "approved", created_at: "2025-01-25T11:00:00Z", validation_notes: "Certificat médical valide",
  },
  {
    id: "d5", document_type: "Rapport", file_name: "rapport_radiologie_thorax.pdf", file_url: "fake/rapport.pdf",
    file_size: 512000, status: "approved", created_at: "2025-02-04T16:00:00Z", validation_notes: null,
  },
  {
    id: "d6", document_type: "Carte CNAM", file_name: "carte_cnam_scan.jpg", file_url: "fake/carte.jpg",
    file_size: 1048576, status: "approved", created_at: "2022-09-01T08:00:00Z", validation_notes: "Carte validée",
  },
  {
    id: "d7", document_type: "Bilan", file_name: "bilan_sanguin_complet_fev2025.pdf", file_url: "fake/bilan.pdf",
    file_size: 345600, status: "pending", created_at: "2025-02-07T10:30:00Z", validation_notes: null,
  },
  {
    id: "d8", document_type: "Facture", file_name: "facture_clinique_elmanar.pdf", file_url: "fake/facture2.pdf",
    file_size: 156000, status: "rejected", created_at: "2025-01-18T14:00:00Z", validation_notes: "Facture illisible - veuillez soumettre un scan de meilleure qualité",
  },
];

const FAKE_EVENTS = [
  {
    id: "e1", title: "Visite de contrôle annuelle", event_type: "rendez-vous",
    start_date: "2025-02-18T09:00:00Z", end_date: "2025-02-18T09:30:00Z",
    description: "Dr. Khaled Mansour - Consultation de routine", all_day: false,
  },
  {
    id: "e2", title: "Résultat analyses sang", event_type: "rappel",
    start_date: "2025-02-14T10:00:00Z", end_date: null,
    description: "Récupérer les résultats du bilan sanguin au laboratoire BioSanté", all_day: false,
  },
  {
    id: "e3", title: "Renouvellement carte CNAM", event_type: "rappel",
    start_date: "2025-03-01T08:00:00Z", end_date: null,
    description: "Date limite pour le renouvellement de la carte d'assurance maladie", all_day: true,
  },
  {
    id: "e4", title: "Séance kinésithérapie", event_type: "rendez-vous",
    start_date: "2025-02-20T14:00:00Z", end_date: "2025-02-20T15:00:00Z",
    description: "Centre Kiné Santé Plus - Séance rééducation épaule", all_day: false,
  },
  {
    id: "e5", title: "Consultation ORL - suivi", event_type: "rendez-vous",
    start_date: "2025-02-25T11:00:00Z", end_date: "2025-02-25T11:30:00Z",
    description: "Dr. Amira Belhadj - Suivi audiogramme", all_day: false,
  },
  {
    id: "e6", title: "Vaccination grippe saisonnière", event_type: "rappel",
    start_date: "2025-03-10T08:00:00Z", end_date: null,
    description: "Campagne de vaccination CNAM - Centre de santé de base", all_day: true,
  },
  {
    id: "e7", title: "Contrôle dentaire", event_type: "rendez-vous",
    start_date: "2025-03-05T10:00:00Z", end_date: "2025-03-05T10:45:00Z",
    description: "Cabinet Dentaire Dr. Haddad - Contrôle post-traitement", all_day: false,
  },
];

export function useUserDashboardData() {
  const [reimbursements, setReimbursements] = useState<any[]>(FAKE_REIMBURSEMENTS);
  const [documents, setDocuments] = useState<any[]>(FAKE_DOCUMENTS);
  const [events, setEvents] = useState<any[]>(FAKE_EVENTS);
  const [memberRecord, setMemberRecord] = useState<any>(FAKE_MEMBER);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reimbRes, docRes, eventRes, memberRes] = await Promise.all([
        supabase.from("reimbursements").select("*, insured_member:insured_members(first_name, last_name), provider:health_providers(name)").order("created_at", { ascending: false }).limit(50),
        supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("calendar_events").select("*").order("start_date", { ascending: true }).limit(50),
        supabase.from("insured_members").select("*").limit(1),
      ]);
      if (reimbRes.data && reimbRes.data.length > 0) setReimbursements(reimbRes.data);
      if (docRes.data && docRes.data.length > 0) setDocuments(docRes.data);
      if (eventRes.data && eventRes.data.length > 0) setEvents(eventRes.data);
      if (memberRes.data && memberRes.data.length > 0) setMemberRecord(memberRes.data[0]);
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
    totalDocs: documents.length,
  };

  return { reimbursements, documents, events, memberRecord, loading, stats, getStatusBadge, fetchData };
}
