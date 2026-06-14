import { useEffect, useMemo, useState } from 'react';
import { loadGiftPreview, loadWines, loadWinesAsync, saveWines } from '../lib/storage';
import type { Wine } from '../types/wine';

export function useCollection() {
  const [wines, setWines] = useState<Wine[]>(() => loadWines());

  useEffect(() => {
    let active = true;
    loadWinesAsync().then((savedWines) => {
      if (active) setWines(savedWines);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateWines = (next: Wine[]) => {
    setWines(next);
    saveWines(next);
  };

  const addWine = (wine: Wine) => updateWines([wine, ...wines]);

  const updateWine = (wine: Wine) => updateWines(wines.map((item) => (item.id === wine.id ? wine : item)));

  const deleteWine = (id: string) => updateWines(wines.filter((wine) => wine.id !== id));

  const loadPreview = () => setWines(loadGiftPreview());

  const analytics = useMemo(() => {
    const ratings = wines.flatMap((wine) => wine.tastings.map((tasting) => tasting.rating));
    const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    const value = wines.reduce((sum, wine) => sum + wine.estimatedValue, 0);
    const byCountry = mode(wines.map((wine) => wine.country.en));
    const byGrape = mode(wines.map((wine) => wine.grape.en));
    const byRegion = mode(wines.map((wine) => wine.region.en));
    const consumedThisYear = wines.filter((wine) => wine.consumed && wine.tastings.some((tasting) => tasting.date.startsWith('2026'))).length;

    return {
      total: wines.length,
      value,
      averageRating,
      favouriteCountry: byCountry,
      favouriteGrape: byGrape,
      commonRegion: byRegion,
      consumedThisYear,
    };
  }, [wines]);

  return { wines, analytics, addWine, updateWine, deleteWine, loadPreview };
}

function mode(values: string[]) {
  if (!values.length) return '—';
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
