import prisma from "@/api/server/prisma";
import { Domain } from "@prisma/client";

export const otherTeamHasDomainDelegation = async (domain: Domain) => {
  const otherDomains = await prisma.domain.findMany({
    where: { name: domain.name, NOT: { id: domain.id } },
  });

  return otherDomains.some((domain) => domain.is_delegated);
};
