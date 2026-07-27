import type { Repositories } from '../../db/repository-factory';
import type { UpdateWorkshopInput } from './workshop.validation';

/**
 * PKG-024 — layered pattern: Router → Controller → Service → Repository.
 * This service has almost no logic of its own yet (workshop profile
 * management is close to pure CRUD) — kept as a real layer anyway so
 * future rules (e.g. GST number format validation before allowing GST
 * invoicing, Month 3+) have an obvious home instead of leaking into the
 * controller.
 */
export class WorkshopService {
  constructor(private readonly repos: Repositories) {}

  async getProfile(workshopId: string) {
    return this.repos.workshops.findByIdOrThrow(workshopId);
  }

  async updateProfile(workshopId: string, input: UpdateWorkshopInput) {
    return this.repos.workshops.update(workshopId, input);
  }
}
