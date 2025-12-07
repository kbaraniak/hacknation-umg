import { Input } from "@heroui/input";
import { Button } from "@heroui/button"; // Assuming Button component exists in your setup

export default function Home() {
   // Create an array of years (example range from 2000 to 2030)
   const years = Array.from({ length: 31 }, (_, i) => 2000 + i);

   return (
      <>
         <div className="flex justify-between items-center gap-4 mb-4">
            {/* Date Range */}
            <div className="flex gap-4">
               <Input
                  isRequired
                  className="max-w-30"
                  defaultValue="2015"
                  minLength={4}
                  label="Rok startowy"
                  type="select" // Custom type for select input
               >
                  {years.map((year) => (
                     <option key={year} value={year}>
                        {year}
                     </option>
                  ))}
               </Input>
               <Input
                  isRequired
                  className="max-w-30"
                  defaultValue="2025"
                  minLength={4}
                  label="Rok końcowy"
                  type="select" // Custom type for select input
               >
                  {/* Rendering Year Options */}
                  {years.map((year) => (
                     <option key={year} value={year}>
                        {year}
                     </option>
                  ))}
               </Input>
            </div>
            <Button className="h-100%" color="primary">Szukaj</Button>
         </div>
      </>
   );
}
