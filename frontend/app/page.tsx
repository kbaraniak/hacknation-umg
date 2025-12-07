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
            <div className="flex justify-between items-center gap-4 mb-4">
                {/* Date Range */}
                <div className="flex gap-4">
                    <Input
                        isRequired
                        className="max-w-30"
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
                        className="max-w-30"
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
                <div className="flex gap-4">
                    <PKDModal onPKDsChange={setSelectedPKDs} />
                    <Button 
                        variant="bordered" 
                        color="danger" 
                        isIconOnly 
                        className="hover:text-white"
                        onPress={handleClearAll}
                        isDisabled={selectedPKDs.length === 0}
                    >
                        <DeleteOutlineIcon/>
                    </Button>
                </div>
                <Button className="h-100%" color="primary">Szukaj</Button>
            </div>
        </>
    );
}
