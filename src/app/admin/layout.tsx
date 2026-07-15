import { connection } from "next/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return children;
}
