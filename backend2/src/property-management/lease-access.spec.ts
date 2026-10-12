import { MySqlDialect } from "drizzle-orm/mysql-core";
import { leaseAccessibleBy } from "./lease-access";

describe("leaseAccessibleBy", () => {
  const sqlOf = (cond: any) => new MySqlDialect().sqlToQuery(cond);

  it("principal OU colocataire actif, scope organisation", () => {
    const q = sqlOf(leaseAccessibleBy(8, 3));
    expect(q.sql).toContain("`real_estate_leases`.`organization_id` = ?");
    expect(q.sql).toContain("`real_estate_leases`.`tenant_id` = ?");
    expect(q.sql).toMatch(/EXISTS \(SELECT 1 FROM `real_estate_lease_cotenants`/);
    expect(q.sql).toContain("`is_active` = 1");
    expect(q.sql).toContain("`organization_id` = ");
    expect(q.params).toEqual(expect.arrayContaining([8, 3]));
  });
});
