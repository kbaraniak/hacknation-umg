"use client";

import {Input} from "@heroui/input";
import {Button} from "@heroui/button";
import PKDModal from "@/app/components/pkdModal";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { usePKD } from "@/app/context/PKDContext";

export default function Home() {
    const { selectedPKDs, setSelectedPKDs, startYear, setStartYear, endYear, setEndYear } = usePKD();
    
    // Create an array of years (example range from 2000 to 2030)
    const years = Array.from({length: 31}, (_, i) => 2000 + i);

    const handleClearAll = () => {
        setSelectedPKDs([]);
    };

    return (
        <>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
                {/* Date Range */}
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <Input
                        isRequired
                        className="w-full sm:max-w-[200px]"
                        value={startYear.toString()}
                        onChange={(e) => setStartYear(Number(e.target.value))}
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
                        className="w-full sm:max-w-[200px]"
                        value={endYear.toString()}
                        onChange={(e) => setEndYear(Number(e.target.value))}
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
                <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                    <PKDModal onPKDsChange={setSelectedPKDs} />
                    <Button 
                        variant="bordered" 
                        color="danger" 
                        isIconOnly 
                        className="hover:text-white shrink-0"
                        onPress={handleClearAll}
                        isDisabled={selectedPKDs.length === 0}
                    >
                        <DeleteOutlineIcon/>
                    </Button>
                </div>
                <Button className="w-full lg:w-auto" color="primary">Szukaj</Button>
            </div>
        </>
    );
}
