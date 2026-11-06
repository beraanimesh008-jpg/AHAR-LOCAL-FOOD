import { Router, Request, Response } from 'express';
import { db } from '../db';
import { locationService } from '../services/locationService';

export const serviceAreaRouter = Router();

// Public: List active service areas
serviceAreaRouter.get('/', (req: Request, res: Response) => {
  const store = db.getStore();
  return res.json({
    success: true,
    data: store.service_areas.filter((sa: any) => sa.is_active)
  });
});

// Check if a given latitude/longitude is within serviceable boundaries
serviceAreaRouter.post('/validate-location', (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and Longitude required' });
  }

  const serviceArea = locationService.findServiceAreaForLocation({
    lat: Number(lat),
    lng: Number(lng)
  });

  const isServiceable = !!serviceArea;

  return res.json({
    success: true,
    data: {
      isServiceable,
      serviceArea,
      message: isServiceable
        ? `Delivering in: ${serviceArea.name}`
        : 'Sorry, we do not deliver to this location yet. (দুঃখিত, এই এলাকায় আমাদের ডেলিভারি এখনও চালু হয়নি।)'
    }
  });
});
