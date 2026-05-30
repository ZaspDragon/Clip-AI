import { redirect } from "next/navigation";

export default function NewCampaignRedirectPage() {
  redirect("/dashboard");
}
