import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { navigate } from "@/lib/router.js";
import ProviderPicker from "@/components/keys/ProviderPicker";
import KeyForm from "@/components/keys/KeyForm";
import { checkKey } from "@/lib/keyActions";
import { toast } from "@/lib/store";

export default function NewKey() {
  const [provider, setProvider] = useState(null);

  async function done(key) {
    navigate({ to: "/keys/$keyId", params: { keyId: key.id } });
    toast("Key saved to the vault", { tone: "success", detail: "Validating in the background…" });
    // Validate in the background so the card shows a real status on arrival.
    checkKey(key).catch(() => {});
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pt-12 md:px-10 md:pt-14">
      <button onClick={() => (provider ? setProvider(null) : navigate({ to: "/keys" }))} className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {provider ? "All providers" : "Keys"}
      </button>

      {provider ? (
        <div className="anim-rise mt-5">
          <h1 className="text-[24px] leading-tight md:text-[28px]">{provider.name}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {provider.category} · {provider.adapterType} adapter
          </p>
          <div className="mt-6">
            <KeyForm provider={provider} onDone={done} />
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <h1 className="text-[24px] leading-tight md:text-[28px]">Add a key</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Pick a provider — the catalog covers 78 of them.</p>
          <div className="mt-5">
            <ProviderPicker onPick={setProvider} />
          </div>
        </div>
      )}
    </div>
  );
}
